import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectoractComponent } from './selectoract.component';

describe('SelectoractComponent', () => {
  let component: SelectoractComponent;
  let fixture: ComponentFixture<SelectoractComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectoractComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectoractComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
