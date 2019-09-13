import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'bluetooth', pathMatch: 'full' },
  { path: 'home/:address', loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)},
  { path: 'bluetooth', loadChildren: './pages/bluetooth/bluetooth.module#BluetoothPageModule' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
