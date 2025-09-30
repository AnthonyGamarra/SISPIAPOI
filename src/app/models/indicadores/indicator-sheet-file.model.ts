export interface IndicatorSheetFile {
  idIndicatorSheetFile?: number;
  name?: string;
  fileExtension?: string;
  file?: any; // Este puede ser un Blob, un base64, o un File, según el caso
  active?: boolean;
}
