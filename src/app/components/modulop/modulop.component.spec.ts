import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModulopComponent } from './modulop.component';

describe('ModulopComponent', () => {
  let component: ModulopComponent;
  let fixture: ComponentFixture<ModulopComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModulopComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModulopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
