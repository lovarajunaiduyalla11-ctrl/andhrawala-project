pipeline {
  agent any
  options { timestamps() }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Archive HTML') {
      steps {
        // Keeps a copy of the site as a Jenkins artifact
        archiveArtifacts artifacts: 'public/index.html', fingerprint: true
      }
    }

    stage('Docker Build & Push') {
      steps {
        script {
          def tag = env.BUILD_NUMBER
          withCredentials([usernamePassword(credentialsId: 'docker-hub',
                                           usernameVariable: 'DH_USER',
                                           passwordVariable: 'DH_PASS')]) {
            sh """
              set -eux
              echo "\$DH_PASS" | docker login -u "\$DH_USER" --password-stdin
              docker build -t "\$DH_USER/andhrawala:${tag}" -t "\$DH_USER/andhrawala:latest" .
              docker push "\$DH_USER/andhrawala:${tag}"
              docker push "\$DH_USER/andhrawala:latest"
            """
            env.IMAGE_REPO = "${DH_USER}/andhrawala"
            env.IMAGE_TAG  = tag
          }
        }
      }
    }
  }

  post {
    always { sh 'docker logout || true' }
    failure { echo '❌ Pipeline failed' }
    success { echo "✅ Successfully built and pushed ${IMAGE_REPO}:${IMAGE_TAG}" }
  }
}
