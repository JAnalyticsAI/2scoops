using UnityEngine;

// Attach this to any GameObject in the scene. It will attempt to assign the
// sprite at Resources/icecream (path configurable) to the configured prefab's
// SpriteRenderer so instantiated prefabs show the ice cream image.
public class IceCreamAssigner : MonoBehaviour
{
    [Tooltip("Prefab GameObject that contains (or has a child with) a SpriteRenderer")] 
    public GameObject floatingPrefab;

    [Tooltip("Path under Assets/Resources (without extension). e.g. 'icecream'")]
    public string resourceSpritePath = "icecream";

    void Awake()
    {
        if (floatingPrefab == null)
        {
            Debug.LogWarning("IceCreamAssigner: floatingPrefab not set.");
            return;
        }

        var sprite = Resources.Load<Sprite>(resourceSpritePath);
        if (sprite == null)
        {
            Debug.LogWarning($"IceCreamAssigner: Sprite not found at Resources/{resourceSpritePath}");
            return;
        }

        // Try to find a SpriteRenderer on the prefab itself
        var sr = floatingPrefab.GetComponent<SpriteRenderer>();
        if (sr != null)
        {
            sr.sprite = sprite;
            return;
        }

        // Otherwise try a child SpriteRenderer
        var childSr = floatingPrefab.GetComponentInChildren<SpriteRenderer>();
        if (childSr != null)
        {
            childSr.sprite = sprite;
            return;
        }

        Debug.LogWarning("IceCreamAssigner: No SpriteRenderer found on the prefab or its children.");
    }
}
