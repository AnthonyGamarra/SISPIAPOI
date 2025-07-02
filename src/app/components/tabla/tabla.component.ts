import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TableModule } from 'primeng/table';


@Component({
  selector: 'app-tabla',
  templateUrl: './tabla.component.html',
  styleUrls: ['./tabla.component.scss'],
  imports:[TableModule]
})
export class TablaComponent implements OnChanges {
  @Input() ano!: string;
  @Input() centro!: string;
  @Input() centroc!: string;

  data: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    // Verifica que todos los inputs tengan valor antes de generar data
    if (this.ano && this.centro && this.centroc) {
      this.data = [
        {
          ano: this.ano,
          centro: this.centro,
          centroc: this.centroc
        }
      ];
    } else {
      this.data = []; // Si faltan valores, limpia la tabla
    }
  }
}