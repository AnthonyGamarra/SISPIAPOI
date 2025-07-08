import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown'; 


interface Product {
  id: string;
  code: string;
  name: string;
  inventoryStatus: string;
  price: number;
}


@Component({
  selector: 'app-form9',
  imports: [CommonModule,FormsModule, TableModule, InputTextModule, ButtonModule, RippleModule, TagModule, DropdownModule],
  templateUrl: './form9.component.html',
  styleUrl: './form9.component.scss'
})


export class Form9Component implements OnInit {

  products: Product[] = [];
  statuses: { label: string, value: string }[] = [];

  meses: string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  filtroCodPofi: string = '';
  filtroPosicion: string = '';
  filtroTipoGasto: string = '';
  filas: any[] = [
    { codPofi: '', posicionPresupuestaria: '', tipoGasto: 'Gasto ineludible', montos: Array(12).fill(0) },
    { codPofi: '', posicionPresupuestaria: '', tipoGasto: 'Otros tipos de gasto', montos: Array(12).fill(0) }
  ];

  ngOnInit(): void {
    this.products = [
      { id: '1000', code: 'P1000', name: 'Product 1', inventoryStatus: 'INSTOCK', price: 29.99 },
      { id: '1001', code: 'P1001', name: 'Product 2', inventoryStatus: 'LOWSTOCK', price: 19.99 },
      { id: '1002', code: 'P1002', name: 'Product 3', inventoryStatus: 'OUTOFSTOCK', price: 0 },
    ];

    this.statuses = [
      { label: 'In Stock', value: 'INSTOCK' },
      { label: 'Low Stock', value: 'LOWSTOCK' },
      { label: 'Out of Stock', value: 'OUTOFSTOCK' }
    ];
  }

  getSeverity(status: string): string {
    switch (status) {
      case 'INSTOCK':
        return 'success';
      case 'LOWSTOCK':
        return 'warning';
      case 'OUTOFSTOCK':
        return 'danger';
      default:
        return '';
    }
  }

  onRowEditInit(product: Product): void {
    console.log('Edit Init', product);
    // Aquí podrías guardar una copia del estado original si necesitas cancelar
  }

  onRowEditSave(product: Product): void {
    console.log('Edit Save', product);
    // Aquí podrías enviar cambios al backend
  }

  onRowEditCancel(product: Product, index: number): void {
    console.log('Edit Cancel', product, index);
    // Aquí podrías restaurar los datos originales si los guardaste en onRowEditInit
  }

  get filasFiltradas() {
    return this.filas.filter(fila =>
      (!this.filtroCodPofi || fila.codPofi.toLowerCase().includes(this.filtroCodPofi.toLowerCase())) &&
      (!this.filtroPosicion || fila.posicionPresupuestaria.toLowerCase().includes(this.filtroPosicion.toLowerCase())) &&
      (!this.filtroTipoGasto || fila.tipoGasto === this.filtroTipoGasto)
    );
  }

  getTotal(fila: any): number {
    return fila.montos.reduce((acc: number, val: number) => acc + (Number(val) || 0), 0);
  }

  agregarFila(): void {
    this.filas.push({ codPofi: '', posicionPresupuestaria: '', tipoGasto: '', montos: Array(12).fill(0) });
  }

  eliminarFila(index: number): void {
    if (this.filas.length > 1) {
      this.filas.splice(index, 1);
    }
  }
}
