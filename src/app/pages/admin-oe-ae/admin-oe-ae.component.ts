import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../../components/footer/footer.component';
import { MenubarComponent } from '../../components/menubar/menubar.component';
import { OeAeAdminComponent } from "../../components/oe-ae-admin/oe-ae-admin.component";

@Component({
  selector: 'app-admin-planificacion',
  imports: [
    CommonModule,
    MenubarComponent,
    FooterComponent,
    OeAeAdminComponent
],
  templateUrl: './admin-oe-ae.component.html',
  styleUrl: './admin-oe-ae.component.scss'
})
export class AdminOeAeComponent {

}
