import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FormulationSupportFile } from '../../../models/logic/formulationSupportFile.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FormulationSupportFileService {

  private readonly BASE_URL = environment.apiLogicUrl + '/formulation-support-file';

  constructor(private http: HttpClient) { }

  // 📥 Subir nuevo archivo
  uploadFile(file: File, idFormulation: number): Observable<number> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('idFormulation', idFormulation.toString());
    return this.http.post<number>(`${this.BASE_URL}`, formData);
  }

  // 🔁 Actualizar archivo existente
  updateFile(idFormulation: number, file: File): Observable<void> {
    const formData = new FormData();
    formData.append('idFormulation', idFormulation.toString());
    formData.append('file', file);
    return this.http.post<void>(`${this.BASE_URL}/update`, formData);
  }

  // 📄 Obtener metadatos del archivo
  getById(id: number): Observable<FormulationSupportFile> {
    return this.http.get<FormulationSupportFile>(`${this.BASE_URL}/${id}`);
  }

  // 📥 Descargar el archivo binario
  downloadFile(id: number): Observable<Blob> {
    return this.http.get(`${this.BASE_URL}/${id}/file`, {
      responseType: 'blob'
    });
  }

  // ❌ Eliminar archivo por ID
  deleteById(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

}
