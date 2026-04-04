from PIL import Image, ImageDraw
import random
import math

class Particle:
    def __init__(self, x, y, color):
        self.x = x
        self.y = y
        # Random velocity in any direction
        angle = random.uniform(0, 2 * math.pi)
        speed = random.uniform(1, 3)
        self.vx = math.cos(angle) * speed
        self.vy = math.sin(angle) * speed
        self.size = random.uniform(2, 4)
        self.color = color
        self.alpha = 255
    
    def update(self):
        # Update position
        self.x += self.vx
        self.y += self.vy
        # Reduce size and alpha
        self.size *= 0.95
        self.alpha *= 0.95
    
    def is_alive(self):
        return self.size > 0.1 and self.alpha > 1

def create_particles(image_path):
    # Load the image and convert to RGBA
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    particles = []
    # Create particles from non-transparent pixels
    for i in range(width):
        for j in range(height):
            r, g, b, a = pixels[i, j]
            if r < 50 and g < 50 and b < 50:  # Only create particles from visible pixels
                particles.append(Particle(i, j, (r, g, b)))
    
    return particles, (width, height)

def generate_frames(particles, size, num_frames=300):
    frames = []
    width, height = size
    
    for _ in range(num_frames):
        # Create a new transparent frame
        frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame)
        
        # Update and draw particles
        for particle in particles:
            # if particle.is_alive():
            # Calculate bounding box for the circle
            x, y = int(particle.x), int(particle.y)
            s = int(particle.size)
            if s > 0:
                # Draw circle with current color and alpha
                draw.ellipse(
                    [x - s, y - s, x + s, y + s],
                    fill=(particle.color[0], particle.color[1], particle.color[2], int(particle.alpha))
                )
            particle.update()
        
        frames.append(frame)
    
    return frames

def save_gif(frames, output_path, duration=50):
    # Save frames as GIF
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        transparency=0,
        disposal=2  # Clear frame before drawing next
    )

if __name__ == "__main__":
    # Path to the input image
    input_image = "gongxi.png"
    # Path to save the output GIF
    output_gif = "particles.gif"
    
    # Create particles from the image
    particles, size = create_particles(input_image)
    print(f"Created {len(particles)} particles")
    
    # Generate animation frames
    frames = generate_frames(particles, size)
    print(f"Generated {len(frames)} frames")
    
    # Save as GIF
    save_gif(frames, output_gif)
    print(f"GIF saved to {output_gif}")
