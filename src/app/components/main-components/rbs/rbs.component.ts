import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-rbs',
  templateUrl: './rbs.component.html',
  styleUrls: ['./rbs.component.scss'],
  standalone: true,
  imports: [CommonModule],
  providers: [DecimalPipe]
})
export class RBSComponent {

  @Input() goods: number | null = null;
  @Input() remuneration: number | null = null;
  @Input() services: number | null = null;
}
