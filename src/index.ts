import * as crypto from 'crypto';
import * as net from 'net';
import * as winston from 'winston';

interface ConstructorOptions {
  host?: string;
  port?: number;
  IAID?: number;
  IAName?: string;
  IADescription?: string;
  username?: string;
  password?: string;
}

export = class Fishbowl {
  private key = '';
  private userId = '';

  private connection = new net.Socket();
  private connected = false;
  private waiting = false;
  private reqQueue: any[] = [];

  private host: string;
  private port: number;
  private IAID: number;
  private IAName: string;
  private IADescription: string;

  private username: string;
  private password: string;

  private logger: any;

  /**
   * This will set default values then setup a connection with Fishbowl and send a login request
   * @param host - Fishbowl Server Host location
   * @param port - Fishbowl Server Port
   * @param IADescription
   * @param IAID
   * @param IAName - Display name of Integrated App in Fishbowl
   * @param username - Fishbowl username
   * @param password - Fishbowl password
   */
  constructor({
    host = '127.0.0.1',
    port = 28192,
    IAID = 54321,
    IAName = 'Fishbowljs',
    IADescription = 'Fishbowljs helper',
    username = 'admin',
    password = 'admin'
  }: ConstructorOptions) {
    this.host = host;
    this.port = port;
    this.IAID = IAID;
    this.IAName = IAName;
    this.IADescription = IADescription;
    this.username = username;
    this.password = password;

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });

    this.setupConnection();
  }

  public partGetRq = (num: string, getImage: boolean): string => {
    return JSON.stringify({
      FbiJson: {
        Ticket: {
          Key: this.key
        },
        FbiMsgsRq: {
          PartGetRq: {
            Number: num,
            GetImage: getImage
          }
        }
      }
    });
  };

  /**
   * @param req - The request JSON in string format (use requests.js for this info)
   * @param cb - (err: string, res: string)
   */
  public sendRequest = (
    req: string,
    cb: (err: string | null, res: any) => void
  ): void => {
    if (this.waiting && !req.includes('LoginRq')) {
      this.reqQueue.push({ req, cb });
      return;
    }

    this.waiting = true;
    if (!this.connected) {
      this.logger.info('Not connected to server, connecting now...');
      this.reqQueue.push({ req, cb });
      this.setupConnection();
      return;
    }

    this.connection.once('done', (err, data) => {
      if (err) {
        return cb(err, null);
      }

      // Check for connectivity errors with fishbowl server
      if (data.FbiJson.FbiMsgsRs.statusCode !== 1000) {
        const fbError = data.FbiJson.FbiMsgsRs.statusMessage;
        this.logger.error(fbError);
        return cb(fbError, null);
      }

      // Check for data error
      const fbData = Object.keys(data.FbiJson.FbiMsgsRs)[1];
      if (data.FbiJson.FbiMsgsRs[fbData].statusCode !== 1000) {
        const fbError = data.FbiJson.FbiMsgsRs.statusMessage;
        this.logger.error(fbError);
        return cb(fbError, null);
      }

      if (fbData === 'LoginRs') {
        return cb(null, data);
      } else if (fbData === 'ExecuteQueryRs') {
        // TODO: parse query response
      } else {
        return cb(null, data.FbiJson.FbiMsgsRs[fbData]);
      }

      if (!data.FbiJson.FbiMsgsRs.LoginRs) {
        this.deque();
      }
    });

    const reqLength = Buffer.alloc(4);
    reqLength.writeIntBE(Buffer.byteLength(req, 'utf8'), 0, 4);
    this.connection.write(reqLength);
    this.connection.write(req);
  };

  /**
   * Setup connection with Fishbowl and send a login request
   */
  private setupConnection = (): void => {
    let resLength: number | undefined;
    let resData: any;

    this.connection.connect(this.port, this.host, () => {
      this.connected = true;
      this.sendRequest(this.loginRequest(), (err, res) => {
        if (err) {
          this.logger.error(`Error logging into Fishbowl: ${err}`);
          return;
        }

        this.key = res.FbiJson.Ticket.Key;
        this.userId = res.FbiJson.Ticket.UserID;
        this.deque();
      });
    });

    this.connection.on('close', () => {
      this.logger.info('Disconnected from Fishbowl');
      this.connected = false;
    });

    this.connection.on('error', err => {
      if (this.connection.listenerCount('done') > 0) {
        this.logger.error(err);
        this.connection.emit('done', err, null);
      } else {
        throw new Error(err.message);
      }
    });

    this.connection.on('data', data => {
      if (resLength === undefined) {
        resLength = data.readInt32BE(0);
        resData = data.slice(4);
      } else {
        resData = Buffer.concat([resData, data]);
      }

      if (resData.length === resLength) {
        const resJson = JSON.parse(resData.toString('utf8'));
        resLength = undefined;

        // Inactivity check from server
        if (resJson.FbiJson.FbiMsgsRs.statusCode === 1010) {
          this.connected = false;
          return;
        }

        this.connection.emit('done', null, resJson);
      } else {
        this.logger.info('Waiting for more data from Fishbowl...');
      }
    });
  };

  /**
   * Calls the next request in the queue
   */
  private deque = (): void => {
    this.waiting = false;
    if (this.reqQueue.length > 0) {
      const queuedReq = this.reqQueue.shift();
      this.sendRequest(queuedReq.req, queuedReq.cb);
    }
  };

  /**
   * @return {string} login request string for the server
   */
  private loginRequest = (): string => {
    return JSON.stringify({
      FbiJson: {
        Ticket: {
          Key: ''
        },
        FbiMsgsRq: {
          LoginRq: {
            IAID: this.IAID,
            IAName: this.IAName,
            IADescription: this.IADescription,
            UserName: this.username,
            UserPassword: crypto
              .createHash('md5')
              .update(this.password)
              .digest('base64')
          }
        }
      }
    });
  };
}
