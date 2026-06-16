Put your image files into one of these folders:

labels/        trademark, washing-label, hangtag, barcode, packaging fragments
papers/        paper textures and background sheets
decorations/   tape, crop marks, warning marks, graphic ornaments

Supported browser formats: .png, .jpg, .jpeg, .webp, .svg.

To make files appear in the Collage Lab library, add them to that folder's manifest.json:

[
  { "name": "My Label", "file": "my-label.png" }
]

For a large future library, keep only a small thumbnail in the project and link the full file:

[
  {
    "name": "Remote Paper 01",
    "thumbnail": "paper-thumb-01.jpg",
    "download": "https://example.com/full-paper-01.jpg",
    "tags": ["paper", "background"]
  }
]

Clicking the material uses the thumbnail/preview in the board. The Download button opens the full file link.

Keep file names simple, for example:
brand-tag-01.png
care-label-polyester.jpg
barcode-fragment.svg
