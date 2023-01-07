export interface IAppError extends Error {
	statusCode: number;
	status: string;
}

class AppError extends Error implements IAppError {
	statusCode: number;
	status: string;

	constructor(message: string, statusCode: number) {
		super(message);

		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

		Error.captureStackTrace(this, this.constructor);
	}
}

export default AppError;
