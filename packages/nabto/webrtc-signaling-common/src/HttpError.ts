export class HttpError extends Error {
  constructor(public statusCode: number, public message: string) {
    super(message);
  }
}

export class ProductIdNotFoundError extends HttpError {
  constructor(public statusCode: number, public message: string) {
    super(statusCode, message);
  }
}

export class DeviceIdNotFoundError extends HttpError {
  constructor(public statusCode: number, public message: string) {
    super(statusCode, message);
  }
}
