from PIL import Image
from pathlib import Path

src = Path(
    r"C:\Users\Naren\.cursor\projects\c-Users-Naren-OneDrive-Desktop-mahi\assets"
    r"\c__Users_Naren_AppData_Roaming_Cursor_User_workspaceStorage_ebb8f18b236e1d6f"
    r"5b7ee8981f6ecfc9_images_ChatGPT_Image_Jun_15__2026__10_22_36_PM-9fbd9135-971d-4dcf"
    r"-b69c-baafecaea7c4.png"
)
out = Path(__file__).resolve().parent.parent / "assets"
img = Image.open(src).convert("RGBA")

# Orange app icon (section 2, middle icon)
app_icon = img.crop((635, 118, 735, 218))
app_icon = app_icon.resize((1024, 1024), Image.Resampling.LANCZOS)
app_icon.save(out / "icon.png")

# Adaptive icon foreground with safe-zone padding
adaptive = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
scaled = img.crop((635, 118, 735, 218)).resize((820, 820), Image.Resampling.LANCZOS)
adaptive.paste(scaled, (102, 102), scaled)
adaptive.save(out / "adaptive-icon.png")

# Splash / favicon from white-background app icon
splash_src = img.crop((520, 118, 620, 218)).resize((512, 512), Image.Resampling.LANCZOS)
splash_src.save(out / "splash-icon.png")
splash_src.resize((48, 48), Image.Resampling.LANCZOS).save(out / "favicon.png")

# Horizontal footer logo (section 3, exclude layout label)
footer = img.crop((35, 430, 430, 520))
footer.save(out / "foodbill-logo-footer.png")

print("Saved FoodBill assets to", out)
