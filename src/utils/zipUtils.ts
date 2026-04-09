import JSZip from 'jszip';

export async function createAssetPackZip(options: {
  spriteSheetPng: string;
  manifestJson: string;
  engineFormats?: Record<string, string>;
  backgrounds?: { composite: string; layers: { name: string; dataUrl: string }[] };
  music?: { base64: string; filename: string };
  sfx?: { base64: string; filename: string };
  fileName: string;
}): Promise<Blob> {
  const zip = new JSZip();
  zip.file(`${options.fileName}_sheet.png`, dataUrlToBlob(options.spriteSheetPng));
  zip.file(`${options.fileName}_sheet.json`, options.manifestJson);

  if (options.engineFormats) {
    for (const [key, content] of Object.entries(options.engineFormats)) {
      let ext = key === 'phaser' ? 'atlas.json' : key === 'godot' ? 'tres' : key === 'css' ? 'css' : 'txt';
      zip.file(`${options.fileName}_${key}.${ext}`, content);
    }
  }

  if (options.backgrounds) {
    zip.file(`backgrounds/${options.fileName}_composite.png`, dataUrlToBlob(options.backgrounds.composite));
    options.backgrounds.layers.forEach(layer => {
      zip.file(`backgrounds/${options.fileName}_${layer.name}.png`, dataUrlToBlob(layer.dataUrl));
    });
  }

  if (options.music && options.music.base64) {
    zip.file(`audio/${options.music.filename}`, dataUrlToBlob(options.music.base64));
  }
  if (options.sfx && options.sfx.base64) {
    zip.file(`audio/${options.sfx.filename}`, dataUrlToBlob(options.sfx.base64));
  }

  return zip.generateAsync({ type: 'blob' });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
