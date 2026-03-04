import type { PropType } from "vue";

export type UploadStatus = "ready" | "uploading" | "success" | "error";
export interface UploadRawFile extends File {
  uid: string;
}
export interface UploadFile {
  uid: string;  
  name: string;
  size: number;
  status: UploadStatus;
  percentage: number;
  raw?: UploadRawFile;
  response?: unknown;
  error?: unknown;
}
export interface UploadRequestOptions {
  action: string;
  file: UploadRawFile;
  filename: string;
  data?: Record<string, string | Blob>;
  headers?: Record<string, string>;
  withCredentials?: boolean;
  onProgress?: (evt: ProgressEvent) => void;
  onSuccess?: (response: unknown) => void;
  onError?: (error: unknown) => void;
}

export interface UploadProps {
  action: string;
  name: string;
  multiple: boolean;
  accept: string;
  disabled: boolean;
  limit?: number;
  autoUpload: boolean;
  withCredentials: boolean;
  data?: Record<string, string | Blob>;
  headers?: Record<string, string>;
  fileList: UploadFile[];
  beforeUpload?: (file: UploadRawFile) => boolean | Promise<boolean>;
  httpRequest?: (options: UploadRequestOptions) => XMLHttpRequest | Promise<unknown>;
}

export const uploadProps = {
  action: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: "file",
  },
  multiple: {
    type: Boolean,
    default: false,
  },
  accept: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  limit: Number,
  autoUpload: {
    type: Boolean,
    default: true,
  },
  withCredentials: {
    type: Boolean,
    default: false,
  },
  data: Object as PropType<Record<string, string | Blob>>,
  headers: Object as PropType<Record<string, string>>,
  fileList: {
    type: Array as PropType<UploadFile[]>,
    default: () => [],
  },
  beforeUpload: Function as PropType<UploadProps["beforeUpload"]>,
  httpRequest: Function as PropType<UploadProps["httpRequest"]>,
} as const;

export interface UploadEmits {
  (e: "update:fileList", files: UploadFile[]): void; //声明“可调用签名（call signature）
  (e: "change", file: UploadFile, files: UploadFile[]): void;
  (e: "success", response: unknown, file: UploadFile, files: UploadFile[]): void;
  (e: "error", error: unknown, file: UploadFile, files: UploadFile[]): void;
  (e: "remove", file: UploadFile, files: UploadFile[]): void;
  (e: "exceed", files: File[], uploadFiles: UploadFile[]): void;
}
