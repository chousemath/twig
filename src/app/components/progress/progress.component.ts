import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.scss'],
})
export class ProgressComponent implements OnInit {
  @Input() textTop1: string;
  @Input() textTop2: string;
  @Input() value: number;
  @Input() unit: string;
  @Input() progress: number;
  constructor() { }

  ngOnInit() {}

}
