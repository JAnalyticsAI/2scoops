Unity import instructions for the included `icecream.svg`

- Copy `icecream.svg` into your Unity project under `Assets/Resources/`.
  - If `Resources` doesn't exist, create it: `Assets/Resources/icecream.svg`.

- Unity's built-in support for SVG requires the Vector Graphics package (Package Manager).
  - If you don't want to install that, convert `icecream.svg` to a PNG (e.g. 256x256) and place it in `Assets/Resources/icecream.png`.

- Select the imported asset in Unity and in the Inspector set `Texture Type` to `Sprite (2D and UI)`.

- Create or edit the prefab you use for floating objects so it has a `SpriteRenderer` on the root or a child.

- Add the `IceCreamAssigner` component to any GameObject in the scene (e.g. an empty `LevelController` object).
  - Assign your floating prefab to the `floatingPrefab` field.
  - Leave `resourceSpritePath` as `icecream` if you used the filename `icecream.png` or `icecream.svg`.

- When you run the scene the script will assign the sprite to the prefab's `SpriteRenderer`.

Runtime alternative: instead of using `IceCreamAssigner`, you can manually set the prefab's SpriteRenderer via code in any spawning script:

```csharp
var sprite = Resources.Load<Sprite>("icecream");
var go = Instantiate(floatingPrefab, pos, Quaternion.identity);
var sr = go.GetComponentInChildren<SpriteRenderer>();
if (sr != null) sr.sprite = sprite;
```

Notes
- If you import SVG and it doesn't show as Sprite, install the Unity Vector Graphics package from the Package Manager.
- For crisp pixels, prefer importing a PNG at the desired resolution and set `Pixels Per Unit` appropriately.
