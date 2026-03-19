import { validationResult } from 'express-validator'
import { errorResponse } from '../utils/helpers.js'

export function validateRequest(req, res, next) {
  const result = validationResult(req)

  if (result.isEmpty()) {
    return next()
  }

  return errorResponse(res, 422, 'Validation failed.', 'VALIDATION_ERROR', {
    errors: result.array().map((item) => ({
      field: item.path,
      message: item.msg,
    })),
  })
}
