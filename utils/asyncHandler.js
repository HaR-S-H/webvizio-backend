const asyncHandler = (fn) => async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.error(error);
  
      // Always use a number for status code
      const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;
      const message = error.message || "Internal Server Error";
  
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  };
  
  export default asyncHandler;
  