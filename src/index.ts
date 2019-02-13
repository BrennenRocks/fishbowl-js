import crypto from 'crypto';
import net from 'net';
import winston from 'winston';
import errorCodes from './errorCodes.json';

interface ConstructorOptions {
  host?: string;
  port?: number;
  IAID?: number;
  IAName?: string;
  IADescription?: string;
  username?: string;
  password?: string;
  autoLogin?: boolean;
}

interface Error {
  code: number;
  message: string;
}

export = class Fishbowl {
  private errorCodes: any;
  private key = '';
  private userId = '';

  private connection: net.Socket;
  private connected = false;
  private waiting: boolean;
  private reqQueue: any[] = [];

  private host: string;
  private port: number;
  private IAID: number;
  private IAName: string;
  private IADescription: string;
  private autoLogin: boolean;

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
   * @param autoLogin - Should the integration attempt to relogin when sending requests if disconnected
   */
  constructor({
    host = '127.0.0.1',
    port = 28192,
    IAID = 54321,
    IAName = 'Fishbowljs',
    IADescription = 'Fishbowljs helper',
    username = 'admin',
    password = 'admin',
    autoLogin = true
  }: ConstructorOptions) {
    this.host = host;
    this.port = port;
    this.IAID = IAID;
    this.IAName = IAName;
    this.IADescription = IADescription;
    this.username = username;
    this.password = password;
    this.autoLogin = autoLogin;
    this.connection = new net.Socket();
    this.errorCodes = errorCodes;

    this.waiting = autoLogin;

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({
          level: 'error',
          filename: 'error.log',
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD hh:mm:ss A ZZ'
            }),
            winston.format.json()
          )
        }),
        new winston.transports.File({
          filename: 'combined.log',
          format: winston.format.combine(
            winston.format.timestamp({
              format: 'YYYY-MM-DD hh:mm:ss A ZZ'
            }),
            winston.format.json()
          )
        })
      ]
    });

    this.connectToFishbowl();
  }

  /**
   * @param req - The request you would like to make
   * @param options - The options for the specific request you are making
   * @param cb - (err: Error | null, res: JSON)
   */
  public sendRequest = (
    req: string,
    options: any,
    cb: (err: Error | null, res: any) => void
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

      const fbData = Object.keys(data.FbiJson.FbiMsgsRs)[1];
      if (data.FbiJson.FbiMsgsRs.statusCode !== 1000) {
        const fbError: Error = {
          code: data.FbiJson.FbiMsgsRs.statusCode,
          message:
            data.FbiJson.FbiMsgsRs.statusMessage ||
            this.errorCodes[data.FbiJson.FbiMsgsRs.statusCode]
        };
        this.logger.error(fbError);
        cb(fbError, null);
      } else if (data.FbiJson.FbiMsgsRs[fbData].statusCode !== 1000) {
        const fbError: Error = {
          code: data.FbiJson.FbiMsgsRs[fbData].statusCode,
          message:
            data.FbiJson.FbiMsgsRs[fbData].statusMessage ||
            this.errorCodes[data.FbiJson.FbiMsgsRs[fbData].statusCode]
        };
        this.logger.error(fbError);
        cb(fbError, null);
      } else {
        if (fbData === 'LoginRs') {
          this.key = data.FbiJson.Ticket.Key;
          this.userId = data.FbiJson.Ticket.UserID;
        } else if (fbData === 'ExecuteQueryRs') {
          // TODO: parse query response
        }

        cb(null, data.FbiJson.FbiMsgsRs[fbData]);
      }

      this.deque();
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
      if (this.autoLogin) {
        this.loginToFishbowl();
      } else {
        this.deque();
      }
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

  private loginToFishbowl = (): void => {
    this.sendRequest(
      'LoginRq',
      { username: this.username, password: this.password },
      (err, res) => {
        this.deque();
      }
    );
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
