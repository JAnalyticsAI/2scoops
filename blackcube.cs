using UnityEngine;
using System.Globalization;

public class blackCube : MonoBehaviour
{
    public float speed = 5f;
    public Vector2 initialDirection = new Vector2(1f, 0.3f);

    private Vector2 velocity;

    void Start()
    {
        if (initialDirection.sqrMagnitude == 0f)
            initialDirection = Vector2.right;
        velocity = initialDirection.normalized * speed;
    }

    void Update()
    {
        transform.position += (Vector3)(velocity * Time.deltaTime);

        Camera cam = Camera.main;
        if (cam == null) return;

        Vector3 vp = cam.WorldToViewportPoint(transform.position);
        bool bounced = false;

        if (vp.x <= 0f && velocity.x < 0f)
        {
            velocity.x = -velocity.x;
            bounced = true;
        }
        else if (vp.x >= 1f && velocity.x > 0f)
        {
            velocity.x = -velocity.x;
            bounced = true;
        }

        if (vp.y <= 0f && velocity.y < 0f)
        {
            velocity.y = -velocity.y;
            bounced = true;
        }
        else if (vp.y >= 1f && velocity.y > 0f)
        {
            velocity.y = -velocity.y;
            bounced = true;
        }

        if (bounced)
        {
            velocity = velocity.normalized * speed;
            float z = vp.z;
            vp.x = Mathf.Clamp01(vp.x);
            vp.y = Mathf.Clamp01(vp.y);
            Vector3 worldPos = cam.ViewportToWorldPoint(new Vector3(vp.x, vp.y, z));
            transform.position = new Vector3(worldPos.x, worldPos.y, transform.position.z);
        }
    }

    public void SetSpeed(float newSpeed)
    {
        speed = newSpeed;
        velocity = velocity.normalized * speed;
    }

    public void SetDirection(Vector2 dir)
    {
        if (dir.sqrMagnitude > 0f)
            velocity = dir.normalized * speed;
    }

    void OnCollisionEnter(Collision collision)
    {
        if (collision.contacts.Length == 0) return;
        Vector3 normal = collision.contacts[0].normal;
        Vector2 n = new Vector2(normal.x, normal.y).normalized;
        Vector2 v = velocity;
        Vector2 reflected = v - 2f * Vector2.Dot(v, n) * n;
        velocity = reflected.normalized * speed;
    }

    // Called from JavaScript via SendMessage(objectName, "SetPositionFromNormalized", "nx,ny")
    // `nx` and `ny` are normalized canvas coordinates (0..1) with top-origin for `ny`.
    public void SetPositionFromNormalized(string payload)
    {
        if (string.IsNullOrEmpty(payload)) return;
        var parts = payload.Split(',');
        if (parts.Length < 2) return;
        if (!float.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out float nx)) return;
        if (!float.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out float nyTop)) return;

        Camera cam = Camera.main;
        if (cam == null) return;

        // JS uses top-origin for Y; Unity viewport uses bottom-origin.
        float ny = 1f - nyTop;

        // Preserve current distance from camera to object (z in viewport space)
        float z = cam.WorldToViewportPoint(transform.position).z;
        Vector3 worldPos = cam.ViewportToWorldPoint(new Vector3(nx, ny, z));

        transform.position = new Vector3(worldPos.x, worldPos.y, transform.position.z);
    }

    // Called from JavaScript via SendMessage(objectName, "SetActive", "true"/"false")
    public void SetActive(string payload)
    {
        if (string.IsNullOrEmpty(payload)) return;
        if (bool.TryParse(payload, out bool active))
        {
            gameObject.SetActive(active);
            enabled = active;
        }
    }
}
