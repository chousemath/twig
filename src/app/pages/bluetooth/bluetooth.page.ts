import { Component, OnInit } from '@angular/core';
import { NavController, Platform, AlertController, LoadingController, ActionSheetController } from '@ionic/angular';
import { BluetoothLE, ScanStatus } from '@ionic-native/bluetooth-le/ngx';
import { Subscription } from 'rxjs';

const loadingTime = 3000;

@Component({
  selector: 'app-bluetooth',
  templateUrl: './bluetooth.page.html',
  styleUrls: ['./bluetooth.page.scss'],
})
export class BluetoothPage implements OnInit {
  public imgBluetooth = 'assets/images/icon-bluetooth.png';
  private ble$: Subscription;
  private startScan$: Subscription;
  public clickable = false;
  private scanResults: Array<ScanStatus> = [];
  private scanAddresses = {};
  constructor(
    private navCtrl: NavController,
    public bluetoothle: BluetoothLE,
    public plt: Platform,
    public alertCtrl: AlertController,
    public loadingCtrl: LoadingController,
    public actionSheetCtrl: ActionSheetController,
  ) { }

  ngOnInit() {
  }

  ionViewDidEnter() {
    console.log('bluetooth page ready');
    this.plt.ready().then((readySource) => {
      console.log('Platform ready from', readySource);
      this.ble$ = this.bluetoothle.initialize().subscribe(async (ble) => {
        this.clickable = ble.status.toLowerCase() === 'enabled';
        if (!this.clickable) {
          await this.alertBLE();
        }
      });
    });
  }

  private async alertBLE() {
    const alert = await this.alertCtrl.create({
      header: 'Bluetooth unavailable',
      subHeader: 'User action required',
      message: 'Please enable bluetooth and try again.',
      buttons: ['OK']
    });
    await alert.present();
  }

  async ionViewWillLeave() {
    if (this.ble$) {
      this.ble$.unsubscribe();
    }
    if (this.startScan$) {
      this.startScan$.unsubscribe();
    }
    if (await this.bluetoothle.isScanning()) {
      await this.bluetoothle.stopScan();
    }
  }

  public async tryPairing() {
    if (!this.clickable) {
      await this.alertBLE();
      return;
    }
    this.scanResults = [];
    if (this.startScan$) {
      this.startScan$.unsubscribe();
    }
    this.startScan$ = this.bluetoothle.startScan({}).subscribe((res: ScanStatus) => {
      if (res.status === 'scanResult' && !this.scanAddresses[res.address]) {
        this.scanResults.push(res);
        this.scanAddresses[res.address] = true;
      }
    });

    const loading = await this.loadingCtrl.create({
      message: 'Scanning for BLE devices',
      duration: loadingTime,
    });
    await loading.present();

    setTimeout(async () => {
      if (this.startScan$) {
        this.startScan$.unsubscribe();
      }
      if (await this.bluetoothle.isScanning()) {
        await this.bluetoothle.stopScan();
        this.scanResults = this.scanResults.filter((scanResult: ScanStatus) => scanResult.name);
        const buttons: Array<any> = this.scanResults.map((scanResult: ScanStatus) => {
          return {
            text: scanResult.name,
            icon: 'bluetooth',
            handler: () => {
              this.navCtrl.navigateRoot(`/home/${scanResult.address}`);
            }
          };
        });
        buttons.push({
          text: '닫기',
          icon: 'close',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        });
        const actionSheet = await this.actionSheetCtrl.create({
          header: 'BLE Devices',
          buttons,
        });
        await actionSheet.present();
      }
    }, loadingTime);
  }

}
