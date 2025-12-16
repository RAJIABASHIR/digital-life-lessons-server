import { errorResponse } from "../utils/response.js";

export const errorHandler = (err, req, res, next) => {
  
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal server error";

  
  console.error("❌ Error handler:", {
    message: err.message,
    stack: err.stack,
    statusCode
  });

  const payload = {
    statusCode,
    message
  };

  
  if (process.env.NODE_ENV === "development") {
    payload.stack = err.stack;
  }

  return errorResponse(res, {
    statusCode,
    message,
    errors: payload
  });
};