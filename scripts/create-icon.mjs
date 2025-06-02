import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a simple 16x16 blue square PNG as a placeholder
const createPlaceholderIcon = () => {
	// PNG header and IHDR chunk for 16x16 RGBA image
	const header = Buffer.from([
		0x89,
		0x50,
		0x4e,
		0x47,
		0x0d,
		0x0a,
		0x1a,
		0x0a, // PNG signature
		0x00,
		0x00,
		0x00,
		0x0d, // IHDR chunk length
		0x49,
		0x48,
		0x44,
		0x52, // "IHDR"
		0x00,
		0x00,
		0x00,
		0x10, // width: 16
		0x00,
		0x00,
		0x00,
		0x10, // height: 16
		0x08,
		0x06,
		0x00,
		0x00,
		0x00, // 8 bit, RGBA
		0x1f,
		0xf3,
		0xff,
		0x61, // CRC
	]);

	// Create image data (16x16 blue square)
	const pixelData = [];
	for (let i = 0; i < 16 * 16; i++) {
		pixelData.push(0x25, 0x63, 0xeb, 0xff); // #2563eb (primary blue) with full opacity
	}

	// Compress with zlib (simple uncompressed for now)
	const imageData = Buffer.concat([
		Buffer.from([0x78, 0x01]), // zlib header
		Buffer.from([0x01]), // final block, uncompressed
		Buffer.from([0x00, 0x04, 0xff, 0xfb]), // length and ~length
		Buffer.from(pixelData),
		Buffer.from([0x00, 0x00, 0x00, 0x00]), // Adler-32 placeholder
	]);

	// IDAT chunk
	const idat = Buffer.concat([
		Buffer.from([0x00, 0x00, 0x04, 0x0b]), // chunk length
		Buffer.from([0x49, 0x44, 0x41, 0x54]), // "IDAT"
		imageData,
		Buffer.from([0x00, 0x00, 0x00, 0x00]), // CRC placeholder
	]);

	// IEND chunk
	const iend = Buffer.from([
		0x00,
		0x00,
		0x00,
		0x00, // chunk length
		0x49,
		0x45,
		0x4e,
		0x44, // "IEND"
		0xae,
		0x42,
		0x60,
		0x82, // CRC
	]);

	return Buffer.concat([header, idat, iend]);
};

// Create the icon file
const iconPath = join(dirname(__dirname), "resources", "icon.png");
const iconData = createPlaceholderIcon();
writeFileSync(iconPath, iconData);

console.log("Created placeholder icon at:", iconPath);
