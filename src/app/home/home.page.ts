import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  public slideOpts = {
    initialSlide: 2,
    speed: 400
  };
  constructor() {}

}
