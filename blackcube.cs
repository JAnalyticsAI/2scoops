#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;

// Editor utility to create and wire an off-screen black cube with LevelController.
public static class BlackCubeEditorUtility
{
    [MenuItem("Tools/2scoops/Setup Black Cube & LevelController")]
    public static void CreateBlackCubeAndLevelController()
    {
        // Ensure a camera exists and is tagged MainCamera
        Camera cam = Camera.main;
        if (cam == null) cam = Object.FindObjectOfType<Camera>();

        if (cam == null)
        {
            var camGO = new GameObject("Main Camera");
            cam = camGO.AddComponent<Camera>();
            camGO.tag = "MainCamera";
            Undo.RegisterCreatedObjectUndo(camGO, "Create Main Camera");
        }
        else
        {
            if (cam.gameObject.tag != "MainCamera")
            {
                Undo.RecordObject(cam.gameObject, "Set Camera Tag");
                cam.gameObject.tag = "MainCamera";
            }
        }

        // Ensure there's a LevelController in the scene
        LevelController lc = Object.FindObjectOfType<LevelController>();
        GameObject lcGO = null;
        if (lc == null)
        {
            lcGO = new GameObject("LevelController");
            Undo.RegisterCreatedObjectUndo(lcGO, "Create LevelController");
            lc = lcGO.AddComponent<LevelController>();
            Undo.RegisterCreatedObjectUndo(lc, "Add LevelController component");
        }
        else
        {
            lcGO = lc.gameObject;
        }

        // Create an off-screen black cube named InitialBlackCube if missing
        GameObject cube = GameObject.Find("InitialBlackCube");
        if (cube == null)
        {
            cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Undo.RegisterCreatedObjectUndo(cube, "Create InitialBlackCube");
            cube.name = "InitialBlackCube";
            cube.transform.localScale = Vector3.one * 0.5f;

            if (cam != null)
            {
                Vector3 vp = new Vector3(-0.5f, 0.5f, cam.nearClipPlane + 2f);
                Vector3 world = cam.ViewportToWorldPoint(vp);
                cube.transform.position = world;
            }
            else
            {
                cube.transform.position = new Vector3(-10f, 0f, 0f);
            }

            var rend = cube.GetComponent<Renderer>();
            if (rend != null)
            {
                Shader s = Shader.Find("Unlit/Color");
                if (s != null) rend.sharedMaterial = new Material(s) { color = Color.black };
                else
                {
                    var mat = new Material(Shader.Find("Standard"));
                    mat.color = Color.black;
                    rend.sharedMaterial = mat;
                }

                rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                rend.receiveShadows = false;
            }
                // Add FloatingObject so the cube visibly moves in Play
                var fo = cube.GetComponent<FloatingObject>() ?? cube.AddComponent<FloatingObject>();
                fo.direction = Vector3.right;
                fo.speed = 2f;
                fo.wrapScreen = false;
                // add runtime bridge for JS <-> Unity messaging
                var bridge = cube.GetComponent<InitialBlackCubeBridge>() ?? cube.AddComponent<InitialBlackCubeBridge>();
        }

        // Wire the LevelController.floatingPrefab to the created cube (scene object is fine)
        if (lc != null && cube != null)
        {
            Undo.RecordObject(lc, "Assign floatingPrefab");
            lc.floatingPrefab = cube;
            // ensure debug visibility settings — pick a visible default color
            Undo.RecordObject(lc, "Set debugHighlight");
            lc.debugHighlight = true;
            lc.debugColor = Color.red;
            EditorUtility.SetDirty(lc);
        }

        // Select the LevelController in the Hierarchy for convenience
        if (lcGO != null) Selection.activeGameObject = lcGO;

        // Mark scene dirty so changes are saved
        EditorSceneManager.MarkSceneDirty(SceneManager.GetActiveScene());

        Debug.Log("2scoops: Setup complete — LevelController and InitialBlackCube created/wired.");
    }
}
#endif
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
            // attach bridge so JS can find and control this cube when running WebGL
            var bridge = cube.GetComponent<InitialBlackCubeBridge>() ?? cube.AddComponent<InitialBlackCubeBridge>();
        }

        // Remove this bootstrapper component after setup to avoid repeated runs.
        Destroy(this);
    }
}

// Bridge component that exposes a few small public methods which can be
// invoked from JavaScript using Unity WebGL's SendMessage API.
public class InitialBlackCubeBridge : MonoBehaviour
{
    // Activate/deactivate the cube. Accepts "true"/"false" or "1"/"0".
    public void SetActive(string flag)
    {
        bool active = flag == "1" || flag.Equals("true", System.StringComparison.OrdinalIgnoreCase);
        gameObject.SetActive(active);
        Debug.Log($"InitialBlackCubeBridge.SetActive -> {active}");
    }

    // Receive normalized canvas coordinates from JS as "nx,ny" where (0,0)
    // is top-left in the browser canvas. Converts to Unity viewport coords
    // (0..1, bottom-left origin) and positions the cube in world space.
    public void SetPositionFromNormalized(string coords)
    {
        if (string.IsNullOrEmpty(coords)) return;
        var parts = coords.Split(',');
        if (parts.Length < 2) return;
        if (!float.TryParse(parts[0], out float nx)) return;
        if (!float.TryParse(parts[1], out float ny)) return;

        Camera cam = Camera.main;
        if (cam == null)
        {
            Debug.LogWarning("InitialBlackCubeBridge: no Main Camera found.");
            return;
        }

        // JS normalized Y is top-origin; Unity viewport Y is bottom-origin.
        float vx = Mathf.Clamp01(nx);
        float vy = Mathf.Clamp01(1f - ny);
        Vector3 vp = new Vector3(vx, vy, cam.nearClipPlane + 2f);
        Vector3 world = cam.ViewportToWorldPoint(vp);
        transform.position = world;
        Debug.Log($"InitialBlackCubeBridge.SetPositionFromNormalized -> nx={nx}, ny={ny}, world={world}");
    }

    // Set the cube color with an HTML color string like "#ff0000".
    public void SetColor(string htmlColor)
    {
        if (string.IsNullOrEmpty(htmlColor)) return;
        if (ColorUtility.TryParseHtmlString(htmlColor, out Color c))
        {
            var rend = GetComponent<Renderer>();
            if (rend != null) rend.material.color = c;
        }
    }
}
