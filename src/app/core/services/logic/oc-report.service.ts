import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface OcR1ReportDTO {
  // Define la estructura según tu DTO del backend
  dependencyId?: number;
  year?: number;
  modification?: number;
  // Agrega aquí los campos específicos del reporte R1
}

@Injectable({
  providedIn: 'root'
})
export class OcReportService {

  private readonly BASE_URL = environment.apiLogicUrl + '/reports';

  constructor(private http: HttpClient) { }

  /**
   * Obtiene los datos del reporte OC R1
   * @param dependencyId ID de la dependencia
   * @param year Año del reporte
   * @param modification Número de modificación
   * @returns Observable con los datos del reporte
   */
  getOcR1Data(dependencyId: number, year: number, modification: number): Observable<OcR1ReportDTO[]> {
    const params = new HttpParams()
      .set('dependencyId', dependencyId.toString())
      .set('year', year.toString())
      .set('modification', modification.toString());

    return this.http.get<OcR1ReportDTO[]>(`${this.BASE_URL}/oc-r1`, { params });
  }

  /**
   * Descarga el reporte OC R1 en el formato especificado
   * @param dependencyId ID de la dependencia
   * @param year Año del reporte
   * @param modification Número de modificación
   * @param format Formato del reporte ('excel', 'pdf', 'word'/'docx')
   * @returns Observable con la respuesta HTTP que contiene el archivo
   */
  downloadOcR1Report(dependencyId: number, year: number, modification: number, format: string = 'excel'): Observable<HttpResponse<Blob>> {
    const params = new HttpParams()
      .set('dependencyId', dependencyId.toString())
      .set('year', year.toString())
      .set('modification', modification.toString())
      .set('format', format);

    return this.http.get(`${this.BASE_URL}/oc-r1/download`, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  /**
   * Descarga el reporte OC R2 en el formato especificado
   * @param dependencyId ID de la dependencia
   * @param year Año del reporte
   * @param modification Número de modificación
   * @param format Formato del reporte ('excel', 'pdf', 'word'/'docx')
   * @returns Observable con la respuesta HTTP que contiene el archivo
   */
  downloadOcR2Report(dependencyId: number, year: number, modification: number, format: string = 'excel'): Observable<HttpResponse<Blob>> {
    const params = new HttpParams()
      .set('dependencyId', dependencyId.toString())
      .set('year', year.toString())
      .set('modification', modification.toString())
      .set('format', format);

    return this.http.get(`${this.BASE_URL}/oc-r2/download`, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  /**
   * Descarga el reporte OD Sociales 1 en el formato especificado
   * @param dependencyId ID de la dependencia
   * @param year Año del reporte
   * @param modification Número de modificación
   * @param format Formato del reporte ('excel', 'pdf', 'word'/'docx')
   * @returns Observable con la respuesta HTTP que contiene el archivo
   */
  downloadOdSociales1Report(dependencyId: number, year: number, modification: number, format: string = 'excel'): Observable<HttpResponse<Blob>> {
    const params = new HttpParams()
      .set('dependencyId', dependencyId.toString())
      .set('year', year.toString())
      .set('modification', modification.toString())
      .set('format', format);

    return this.http.get(`${this.BASE_URL}/od-sociales1/download`, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  /**
   * Descarga el reporte OD Sociales 2 en el formato especificado
   * @param dependencyId ID de la dependencia
   * @param year Año del reporte
   * @param modification Número de modificación
   * @param format Formato del reporte ('excel', 'pdf', 'word'/'docx')
   * @returns Observable con la respuesta HTTP que contiene el archivo
   */
  downloadOdSociales2Report(dependencyId: number, year: number, modification: number, format: string = 'excel'): Observable<HttpResponse<Blob>> {
    const params = new HttpParams()
      .set('dependencyId', dependencyId.toString())
      .set('year', year.toString())
      .set('modification', modification.toString())
      .set('format', format);

    return this.http.get(`${this.BASE_URL}/od-sociales2/download`, {
      params,
      responseType: 'blob',
      observe: 'response'
    });
  }

  /**
   * Método auxiliar para descargar un archivo blob
   * @param blob El blob del archivo
   * @param filename Nombre del archivo a descargar
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Método auxiliar para extraer el nombre del archivo de los headers HTTP
   * @param response Respuesta HTTP
   * @returns Nombre del archivo o nombre por defecto
   */
  extractFilename(response: HttpResponse<Blob>, defaultName: string = 'reporte'): string {
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) {
        return matches[1].replace(/['"]/g, '');
      }
    }
    return defaultName;
  }
}
