import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rbs-resume',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rbs-resume.component.html',
  styleUrls: ['./rbs-resume.component.scss']
})
export class RbsResumeComponent {
  @Input() goods: number | null = null;
  @Input() remuneration: number | null = null;
  @Input() services: number | null = null;
}
