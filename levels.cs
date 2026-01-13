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
        // choose prefab if provided, otherwise create a cube primitive
        GameObject go;
        if (floatingPrefab != null)
        {
            go = Instantiate(floatingPrefab);
            go.name = floatingPrefab.name + "_Instance";
        }
        else
        {
            go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = "BlackCube";
            go.transform.localScale = Vector3.one * 0.5f; // half-size
        }

        // pick a random 2D direction and spawn just off-screen opposite that direction
        Vector2 dir2 = Random.insideUnitCircle.normalized;
            if (dir2.sqrMagnitude < 0.0001f) dir2 = Vector2.right; // avoid zero direction
        Vector3 dir3 = new Vector3(dir2.x, dir2.y, 0f);

        Vector2 center = new Vector2(0.5f, 0.5f);
        float spawnDistance = 0.6f; // distance outside viewport to spawn
        Vector2 spawnVP = center - dir2 * spawnDistance;
        Camera cam = Camera.main;
        if (cam == null)
        {
            Debug.LogWarning("No Main Camera found — spawning at world origin offset.");
            Vector3 spawnPosFallback = new Vector3(spawnVP.x * 10f, spawnVP.y * 10f, 0f);
            go.transform.position = spawnPosFallback;
        }
        else
        {
            // place the object in front of the camera so it's visible — push forward along camera forward
            Vector3 spawnPos = cam.ViewportToWorldPoint(new Vector3(spawnVP.x, spawnVP.y, cam.nearClipPlane + 2f));
            Vector3 finalPos = spawnPos + cam.transform.forward * 0.5f;
            go.transform.position = finalPos;
            // enlarge slightly so it's unmistakable during debug runs
            go.transform.localScale = Vector3.one * 0.8f;
        }

        var fo = go.GetComponent<FloatingObject>() ?? go.AddComponent<FloatingObject>();
        fo.speed = Random.Range(speedMin, speedMax);
        fo.direction = dir3.normalized;
        fo.wrapScreen = false; // objects travel on/off screen

        // Make the object clearly visible for debugging: prefer Unlit/Color if present.
        var rend = go.GetComponent<Renderer>();
        if (rend != null)
        {
            Shader s = Shader.Find("Unlit/Color");
            if (s != null) rend.material = new Material(s);
            else rend.material = new Material(Shader.Find("Standard"));

            // if debugHighlight is set, use that color; otherwise use black with slight emission
            if (debugHighlight)
            {
                // choose a clearly visible color for debug (magenta override ensures visibility)
                Color chosen = debugColor;
                if (chosen.grayscale < 0.05f) chosen = Color.magenta;
                rend.material.color = Color.magenta; // force magenta so it's visible
            }
            else
            {
                rend.material.color = Color.black;
                rend.material.EnableKeyword("_EMISSION");
                rend.material.SetColor("_EmissionColor", Color.gray * 0.25f);
            }

            rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            rend.receiveShadows = false;
        }

        // Frustum test to confirm visibility
        if (cam != null && rend != null)
        {
            var planes = GeometryUtility.CalculateFrustumPlanes(cam);
            bool inView = GeometryUtility.TestPlanesAABB(planes, rend.bounds);
            Debug.Log($"Spawned floating object at VP={spawnVP} world={go.transform.position} dir={fo.direction} speed={fo.speed} inView={inView}");
        }
        else
        {
            Debug.Log($"Spawned floating object at VP={spawnVP} world={go.transform.position} dir={fo.direction} speed={fo.speed}");
        }
    }
}