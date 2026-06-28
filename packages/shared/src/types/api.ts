export type ApiErrorCode =
  | "BAD_REQUEST"
  | "INTERNAL_SERVER_ERROR"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export type ApiErrorDetail = {
  path: string;
  message: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
};

export type ApiSuccessResponse<TData> = {
  success: true;
  data: TData;
};

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;
