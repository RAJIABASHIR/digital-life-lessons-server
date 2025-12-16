export const successResponse = (res, {
  statusCode = 200,
  message = "OK",
  data = null,
  meta = undefined
} = {}) => {
  const payload = {
    success: true,
    message
  };

  if (data !== null && data !== undefined) {
    payload.data = data;
  }

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};


export const errorResponse = (res, {
  statusCode = 500,
  message = "Something went wrong",
  errors = undefined
} = {}) => {
  const payload = {
    success: false,
    message
  };

  if (errors) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};