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

        // give it a fresh material and set to black
        var rend = go.GetComponent<Renderer>();
        if (rend != null)
        {
            rend.material = new Material(Shader.Find("Standard"));
            rend.material.color = Color.black;
        }

        // pick a random 2D direction and spawn just off-screen opposite that direction
        Vector2 dir2 = Random.insideUnitCircle.normalized;
        Vector3 dir3 = new Vector3(dir2.x, dir2.y, 0f);

        Vector2 center = new Vector2(0.5f, 0.5f);
        float spawnDistance = 0.6f; // distance outside viewport to spawn
        Vector2 spawnVP = center - dir2 * spawnDistance;
        Vector3 spawnPos = Camera.main.ViewportToWorldPoint(new Vector3(spawnVP.x, spawnVP.y, Camera.main.nearClipPlane + 2f));
        spawnPos.z = 0f;
        go.transform.position = spawnPos;

        var fo = go.GetComponent<FloatingObject>() ?? go.AddComponent<FloatingObject>();
        fo.speed = Random.Range(speedMin, speedMax);
        fo.direction = dir3.normalized;
        fo.wrapScreen = false; // objects travel on/off screen
    }
}