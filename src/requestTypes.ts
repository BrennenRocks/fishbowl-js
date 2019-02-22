export namespace Types {
  export interface PartGet {
    num: string;
    getImage?: boolean;
  }

  export interface ExecuteQuery {
    name?: string;
    query?: string;
  }

  export interface ImportQuery {
    type: string;
    row: object[];
  }
}
