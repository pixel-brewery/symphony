// #region Imports

import { z } from 'zod';
import { workItemEditorMetadataSchema } from './WorkItemEditorMetadataSchema';

// #endregion

export type WorkItemEditorMetadataDto = z.infer<typeof workItemEditorMetadataSchema>;
