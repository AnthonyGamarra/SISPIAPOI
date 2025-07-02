import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Formu1Component } from './formu1.component';

describe('Formu1Component', () => {
  let component: Formu1Component;
  let fixture: ComponentFixture<Formu1Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Formu1Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Formu1Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
