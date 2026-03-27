function login(){

  const role = document.getElementById("role").value;
  const username = document.getElementById("username").value;

  if(username === ""){
    alert("Enter Username");
    return;
  }

  // Save user in browser
  localStorage.setItem("user", username);

  if(role === "student"){
    window.location = "student.html";
  }
  else if(role === "teacher"){
    window.location = "teacher.html";
  }
  else{
    window.location = "admin.html";
  }
}

function logout(){
  localStorage.clear();
  window.location = "index.html";
}