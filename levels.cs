using UnityEngine;

public class FloatingObject : MonoBehaviour
{
    public float speed = 2f;
    public Vector3 direction = Vector3.right;
    public bool wrapScreen = true;

    void Start()
    {
        direction = direction.normalized;
    }

    void Update()
    {
        transform.Translate(direction * speed * Time.deltaTime, Space.World);
        if (wrapScreen) WrapIfNeeded();
    }

    void WrapIfNeeded()
    {
        // Convert world position to viewport (0..1 in x/y). Use small margin so object fully leaves before wrap.
        Vector3 vp = Camera.main.WorldToViewportPoint(transform.position);
        float margin = 0.08f;
        if (vp.x > 1f + margin) vp.x = -margin;
        else if (vp.x < -margin) vp.x = 1f + margin;
        // optional: vertical wrap if desired
        if (vp.y > 1f + margin) vp.y = -margin;
        else if (vp.y < -margin) vp.y = 1f + margin;

        transform.position = Camera.main.ViewportToWorldPoint(new Vector3(vp.x, vp.y, vp.z));
    }
}

public class LevelController : MonoBehaviour
{
    [Tooltip("Prefab with a FloatingObject component or a simple sprite GameObject.")]
    public GameObject floatingPrefab;
    public float spawnInterval = 1.5f;
    public Vector2 spawnYRange = new Vector2(0.2f, 0.8f); // viewport Y range (0..1)
    public float speedMin = 1f;
    public float speedMax = 4f;
    public bool spawnFromLeft = true; // spawn off-screen left and move right
    // Debug helpers to make spawned cubes visible if you can't see them
    public bool debugHighlight = true;
    public Color debugColor = Color.red;

    float timer;

    void Start()
    {
        timer = spawnInterval * 0.5f;
        // start with one black cube immediately
        SpawnFloating();
    }

    void Update()
    {
        timer -= Time.deltaTime;
        if (timer <= 0f)
        {
            SpawnFloating();
            timer = spawnInterval;
        }
    }

    void SpawnFloating()
    {
        // create a black cube primitive, half the default size
        GameObject go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "BlackCube";
        go.transform.localScale = Vector3.one * 0.5f; // half-size

            // give it a fresh material and set to black with slight emission so it's visible
            var rend = go.GetComponent<Renderer>();
            if (rend != null)
            {
                rend.material = new Material(Shader.Find("Standard"));
                rend.material.color = Color.black;
                // enable emission so the black cube can still be seen on dark backgrounds
                rend.material.EnableKeyword("_EMISSION");
                rend.material.SetColor("_EmissionColor", Color.gray * 0.25f);
            }

        // pick a random 2D direction and spawn just off-screen opposite that direction
        Vector2 dir2 = Random.insideUnitCircle.normalized;
            if (dir2.sqrMagnitude < 0.0001f) dir2 = Vector2.right; // avoid zero direction
        Vector3 dir3 = new Vector3(dir2.x, dir2.y, 0f);

        Vector2 center = new Vector2(0.5f, 0.5f);
        float spawnDistance = 0.6f; // distance outside viewport to spawn
        Vector2 spawnVP = center - dir2 * spawnDistance;
        Vector3 spawnPos = Camera.main.ViewportToWorldPoint(new Vector3(spawnVP.x, spawnVP.y, Camera.main.nearClipPlane + 2f));
        // keep the Z returned by the camera conversion so the cube sits at the correct depth
        go.transform.position = spawnPos;

        var fo = go.GetComponent<FloatingObject>() ?? go.AddComponent<FloatingObject>();
        fo.speed = Random.Range(speedMin, speedMax);
        fo.direction = dir3.normalized;
        fo.wrapScreen = false; // objects travel on/off screen

        // Make the cube visible: use an unlit shader if available. When debugging, use a bright
        // highlight color so you can verify spawning/movement even on dark backgrounds.
        var rend = go.GetComponent<Renderer>();
        if (rend != null)
        {
            Shader s = Shader.Find("Unlit/Color");
            if (s != null) rend.material = new Material(s);
            else rend.material = new Material(Shader.Find("Standard"));

            if (debugHighlight) rend.material.color = debugColor;
            else
            {
                rend.material.color = Color.black;
                rend.material.EnableKeyword("_EMISSION");
                rend.material.SetColor("_EmissionColor", Color.gray * 0.25f);
            }

            rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            rend.receiveShadows = false;
        }

        Debug.Log($"Spawned BlackCube at VP={spawnVP} world={spawnPos} dir={fo.direction} speed={fo.speed}");
    }
}