import olefile
import sys

def extract_vba_code(file_path):
    vba_code = ""
    try:
        with olefile.OleFileIO(file_path) as ole:
            for stream_name in ole.listdir():
                if stream_name[0] == 'VBA':  # VBA code streams
                    vba_code += ole.openstream(stream_name).read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error: {e}")
    return vba_code

# Example usage
file_path = sys.argv[1]
code = extract_vba_code(file_path)
print(code) 