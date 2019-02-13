import * as crypto from 'crypto';
import * as net from 'net';
import * as winston from 'winston';

interface ConstructorOptions {
  host?: string;
  port?: number;
  IAID?: number;
  IAName?: string;
  IADescription?: string;
}

export = class Fishbowl {
  private key = '';
  private userId = '';

  private connection: net.Socket;
  private connected = false;
  private waiting = false;
  private reqQueue: any[] = [];

  private host: string;
  private port: number;
  private IAID: number;
  private IAName: string;
  private IADescription: string;

  private logger: any;

  /**
   * This will set default values then setup a connection with Fishbowl and send a login request
   * @param host - Fishbowl Server Host location
   * @param port - Fishbowl Server Port
   * @param IADescription
   * @param IAID
   * @param IAName - Display name of Integrated App in Fishbowl
   */
  constructor({
    host = '127.0.0.1',
    port = 28192,
    IAID = 54321,
    IAName = 'Fishbowljs',
    IADescription = 'Fishbowljs helper'
  }: ConstructorOptions) {
    this.host = host;
    this.port = port;
    this.IAID = IAID;
    this.IAName = IAName;
    this.IADescription = IADescription;
    this.connection = new net.Socket();

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });

    this.connectToFishbowl();
  }

  /**
   * @param req - The request you would like to make
   * @param options - The options for the specific request you are making
   * @param cb - (err: string, res: string)
   */
  public sendRequest = (
    req: string,
    options: any,
    cb: (err: string | null, res: any) => void
  ): void => {
    if (this.waiting && !req.includes('LoginRq')) {
      this.reqQueue.push({ req, options, cb });
      return;
    }

    let reqToFishbowl = '';
    switch (req) {
      case 'LoginRq': {
        reqToFishbowl = this.loginRequest(options.username, options.password);
        break;
      }
      case 'PartGetRq': {
        reqToFishbowl = this.partGetRq(options.num, options.getImage);
        break;
      }
    }

    this.waiting = true;
    if (!this.connected) {
      this.logger.info('Not connected to server, connecting now...');
      this.reqQueue.push({ req, options, cb });
      this.connectToFishbowl();
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
    reqLength.writeIntBE(Buffer.byteLength(reqToFishbowl, 'utf8'), 0, 4);
    this.connection.write(reqLength);
    this.connection.write(reqToFishbowl);
  };

  /**
   * Setup connection with Fishbowl
   */
  private connectToFishbowl = (): void => {
    let resLength: number | undefined;
    let resData: any;

    this.connection.connect(this.port, this.host, () => {
      this.connected = true;
      this.logger.info('Connected to Fishbowl...');
      this.deque();
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
      this.sendRequest(queuedReq.req, queuedReq.options, queuedReq.cb);
    }
  };

  private loginRequest = (username: string, password: string): string => {
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
            UserName: username,
            UserPassword: crypto
              .createHash('md5')
              .update(password)
              .digest('base64')
          }
        }
      }
    });
  };

  private partGetRq = (num: string, getImage: boolean): string => {
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
};
