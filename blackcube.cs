using UnityEngine;

// Runtime bootstrapper: ensures a LevelController exists and creates
// an off-screen black cube for debugging/visibility.
public class SceneBootstrapper : MonoBehaviour
{
    void Awake()
    {
        // Ensure there's a LevelController in the scene
        if (FindObjectOfType<LevelController>() == null)
        {
            var lcGO = new GameObject("LevelController");
            lcGO.AddComponent<LevelController>();
            Debug.Log("Created LevelController GameObject at runtime.");
        }

        // Create a named black cube off-screen if it doesn't already exist
        if (GameObject.Find("InitialBlackCube") == null)
        {
            GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cube.name = "InitialBlackCube";
            cube.transform.localScale = Vector3.one * 0.5f;

            Camera cam = Camera.main;
            if (cam != null)
            {
                // spawn outside the left viewport so it's initially off-screen
                Vector3 vp = new Vector3(-0.5f, 0.5f, cam.nearClipPlane + 2f);
                Vector3 world = cam.ViewportToWorldPoint(vp);
                cube.transform.position = world;
            }
            else
            {
                // fallback to a safe off-screen position
                cube.transform.position = new Vector3(-10f, 0f, 0f);
            }

            var rend = cube.GetComponent<Renderer>();
            if (rend != null)
            {
                Shader s = Shader.Find("Unlit/Color");
                if (s != null) rend.material = new Material(s);
                else rend.material = new Material(Shader.Find("Standard"));
                rend.material.color = Color.black;
                rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                rend.receiveShadows = false;
            }

            Debug.Log("Spawned InitialBlackCube off-screen.");
        }

        // Remove this bootstrapper component after setup to avoid repeated runs.
        Destroy(this);
    }
}
