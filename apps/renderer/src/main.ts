// #region Imports

import { bootstrapApplication } from '@angular/platform-browser';
import { shellConfig } from './configuration/ShellConfig';
import { ShellView } from './views/ShellView';

// #endregion

bootstrapApplication(ShellView, shellConfig).catch((error: unknown) => console.error(error));
