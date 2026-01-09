using UnityEngine;

public class FloatingObject : MonoBehaviour
{
    public float speed = 2f;
    public Vector2 direction = Vector2.right; // set to Vector2.left to go left
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
        if (floatingPrefab == null) return;

        float yViewport = Random.Range(spawnYRange.x, spawnYRange.y);
        float spawnX = spawnFromLeft ? -0.05f : 1.05f; // slightly off-screen
        Vector3 spawnPos = Camera.main.ViewportToWorldPoint(new Vector3(spawnX, yViewport, Camera.main.nearClipPlane + 2f));
        spawnPos.z = 0f;

        GameObject go = Instantiate(floatingPrefab, spawnPos, Quaternion.identity);
        var fo = go.GetComponent<FloatingObject>() ?? go.AddComponent<FloatingObject>();

        fo.speed = Random.Range(speedMin, speedMax);
        fo.direction = spawnFromLeft ? Vector2.right : Vector2.left;
        fo.wrapScreen = false; // set true if you want wrapping
    }
}