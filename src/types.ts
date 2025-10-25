export interface RenderRequest {
  html?: string;
  markdown?: string;
  css?: string;
  javascript?: string;
  renderer?: 'weasyprint' | 'pagedjs' | 'vivliostyle';
  assets?: string; // base64 encoded zip
  data?: Array<Record<string, any>>; // for templating
  options?: {
    renderer?: 'weasyprint' | 'pagedjs' | 'vivliostyle';
    sync?: string | boolean; // 'true', 'false', or boolean
  };
  pdfid?: string; // for status queries
}

export interface RenderOptions {
  renderer: 'weasyprint' | 'pagedjs' | 'vivliostyle';
  sync: boolean;
}

export interface JobStatus {
  pdfid: string;
  status: 'open' | 'in_progress' | 'success' | 'error';
  message?: string;
  pdf?: Buffer;
}

export const ALLOWED_FILE_TYPES = [
  'gif', 'jpeg', 'jpg', 'png', 'svg', 'bmp', 'tif', 'tiff',
  'css', 'js', 'woff', 'ttf', 'otf'
];

export const ALLOWED_MIME_TYPES = [
  'image/gif', 'image/jpeg', 'image/png', 'image/svg+xml',
  'image/bmp', 'image/x-bmp', 'image/x-ms-bmp', 'image/tiff',
  'text/plain', 'text/css', 'text/javascript', 'application/javascript',
  'application/font-woff', 'application/x-font-truetype',
  'application/x-font-opentype'
];