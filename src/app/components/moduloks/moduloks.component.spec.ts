import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuloksComponent } from './moduloks.component';

describe('ModuloksComponent', () => {
  let component: ModuloksComponent;
  let fixture: ComponentFixture<ModuloksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuloksComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModuloksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
