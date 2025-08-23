import { Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { CostAnalysisComponent } from './cost-analysis/cost-analysis.component';
import { FileExplorerComponent } from './file-explorer/explorer.component';

@Component({
  selector: 'app-file-manager-analysis',
  standalone: true,
  imports: [
    TabsModule,

    FileExplorerComponent,
    CostAnalysisComponent
  ],
  templateUrl: './file-manager.component.html',
})
export class FileManagerComponent{
}
