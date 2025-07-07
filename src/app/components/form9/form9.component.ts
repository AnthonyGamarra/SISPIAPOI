import { Component } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';

@Component({
  selector: 'app-form9',
  templateUrl: './form9.component.html',
  styleUrls: ['./form9.component.scss'],
  imports: [AccordionModule]
})
export class Form9Component {
  // Aquí puedes agregar la lógica y datos de tu formulario
  formData = {
    name: '',
    email: '',
    phone: ''
  };

  onSubmit() {
    console.log('Datos del formulario:', this.formData);
    alert('Formulario enviado!');
  }
}

