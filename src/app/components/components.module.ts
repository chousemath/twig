import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ProgressComponent } from './progress/progress.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';


@NgModule({
  declarations: [ProgressComponent],
  imports: [
    CommonModule,
    IonicModule,
    NgbProgressbarModule,
  ],
  exports: [ProgressComponent],
})
export class ComponentsModule { }
