function login(){

  const role = document.getElementById("role").value;
  const username = document.getElementById("username").value;

  if(username === ""){
    alert("Enter Username");
    return;
  }

  // Save user in browser
  localStorage.setItem("user", username);

  // 🔥 FIXED ROUTING (Vercel compatible)
  if(role === "student"){
    window.location.href = "/student";
  }
  else if(role === "teacher"){
    window.location.href = "/teacher";
  }
  else{
    window.location.href = "/admin";
  }
}

function logout(){
  localStorage.clear();
  window.location.href = "/";
}
