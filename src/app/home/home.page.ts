import { Component, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  @ViewChild(IonSlides, {static: false}) slides: IonSlides;
  public imgLeft = 'assets/images/navigate-left.png';
  public imgRight = 'assets/images/navigate-right.png';
  public slideOpts = {
    initialSlide: 2,
    speed: 400
  };
  constructor() {}
  public slidePrev() {
    this.slides.slidePrev();
  }
  public slideNext() {
    this.slides.slideNext();
  }
}
