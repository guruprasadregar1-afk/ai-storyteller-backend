import { Request, Response } from 'express';
import { StyleService } from '../../../services/StyleService';

const styleService = new StyleService();

export async function getStylePresetsController(req: Request, res: Response) {
  const styles = styleService.getStylePresets();
  res.json({ success: true, styles });
}

export async function createStylePresetController(req: Request, res: Response) {
  const newStyle = styleService.createCustomStyle(req.body);
  res.json({ success: true, style: newStyle });
}

export async function generateEnvironmentRefController(req: Request, res: Response) {
  const { locationName, styleName } = req.body;
  const envRef = styleService.generateEnvironmentRef(locationName, styleName);
  res.json({ success: true, environment: envRef });
}
