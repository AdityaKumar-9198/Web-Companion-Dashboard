import os
import numpy as np
from PIL import Image
from scipy.ndimage import label, distance_transform_edt

src_path = r'C:/Users/adity/.gemini/antigravity/brain/4f9105f6-8675-4e4e-a916-ef7281e7ec11/.user_uploaded/media_1793216353079_108a5209.png'
assets_dir = r'c:\Users\adity\OneDrive\Desktop\Companion Dashboard\cross-browser-web-companion\assets'
icons_dir = os.path.join(assets_dir, 'icons')

img = Image.open(src_path).convert('RGBA')
arr = np.array(img).astype(np.float32)

# Step 1: Detect background connected to border
# Background pixels are very close to white:
is_white = (arr[:, :, 0] > 248) & (arr[:, :, 1] > 248) & (arr[:, :, 2] > 248)

labeled, num_features = label(is_white)
border_mask = np.zeros_like(is_white, dtype=bool)
border_mask[0, :] = True
border_mask[-1, :] = True
border_mask[:, 0] = True
border_mask[:, -1] = True

bg_labels = set(labeled[border_mask])
bg_labels.discard(0)
is_outer_bg = np.isin(labeled, list(bg_labels))

# Also include areas close to white that touch outer bg (anti-aliasing)
# Calculate distance to non-bg
# For pixels in is_outer_bg, alpha is 0.
# For pixels within 2px transition boundary, smoothly fade alpha
alpha = np.ones((arr.shape[0], arr.shape[1]), dtype=np.float32) * 255.0
alpha[is_outer_bg] = 0.0

# Soften transition edges:
# For pixels that are not outer_bg, calculate whiteness distance from 255
# If near border and bright, blend alpha
whiteness = np.minimum(np.minimum(arr[:, :, 0], arr[:, :, 1]), arr[:, :, 2])
edge_fade = (whiteness - 235.0) / (255.0 - 235.0)
edge_fade = np.clip(edge_fade, 0.0, 1.0)

# Only fade pixels that neighbor outer_bg
from scipy.ndimage import binary_dilation
neighbor_bg = binary_dilation(is_outer_bg, iterations=2) & (~is_outer_bg)
alpha[neighbor_bg] = 255.0 * (1.0 - edge_fade[neighbor_bg])

out_arr = arr.copy()
out_arr[:, :, 3] = alpha
out_img = Image.fromarray(out_arr.astype(np.uint8))

# Bounding box of content (where alpha > 10)
non_empty = np.where(alpha > 10)
min_y, max_y = non_empty[0].min(), non_empty[0].max()
min_x, max_x = non_empty[1].min(), non_empty[1].max()

# Add a little padding (10px)
pad = 12
min_y = max(0, min_y - pad)
max_y = min(arr.shape[0], max_y + pad)
min_x = max(0, min_x - pad)
max_x = min(arr.shape[1], max_x + pad)

full_cropped = out_img.crop((min_x, min_y, max_x, max_y))

# Save transparent PNG full logo
full_logo_path = os.path.join(assets_dir, 'logo.png')
full_cropped.save(full_logo_path, format='PNG')
print(f'Saved full transparent logo: {full_logo_path} size: {full_cropped.size}')

# Step 2: Extract just the icon (the terminal + shield on the left)
# Icon extends from min_x to approx x=315 in original coordinates
icon_max_x = 315
icon_cropped = out_img.crop((min_x, min_y, icon_max_x, max_y))

# Make icon square with nice margin
w, h = icon_cropped.size
max_dim = max(w, h)
square_size = int(max_dim * 1.08)
square_icon = Image.new('RGBA', (square_size, square_size), (0, 0, 0, 0))
offset_x = (square_size - w) // 2
offset_y = (square_size - h) // 2
square_icon.paste(icon_cropped, (offset_x, offset_y), icon_cropped)

# Save standalone logo-icon.png
icon_path = os.path.join(assets_dir, 'logo-icon.png')
square_icon.resize((512, 512), Image.Resampling.LANCZOS).save(icon_path, format='PNG')
print(f'Saved square logo icon: {icon_path}')

# Step 3: Generate extension icons (16, 32, 48, 128)
for size in [16, 32, 48, 128]:
    resized = square_icon.resize((size, size), Image.Resampling.LANCZOS)
    target = os.path.join(icons_dir, f'icon{size}.png')
    resized.save(target, format='PNG')
    print(f'Generated icon{size}.png')

print('All logo conversions completed successfully!')

